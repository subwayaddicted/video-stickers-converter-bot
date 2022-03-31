import * as dotenv from "dotenv";
import * as winston from "winston";
import { Telegraf, Scenes, session, Telegram } from 'telegraf';
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { exec } from "child_process";
import crypto from 'crypto';
import { createFFmpeg, fetchFile, FFmpeg } from "@ffmpeg/ffmpeg";

dotenv.config();

const rootFolder = __dirname.split(path.sep).slice(0, -1).join('/');

const logsFolder = 'logs';
checkAndCreateFolder(logsFolder);
const logger: winston.Logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/ffmpeg.log', level: 'debug' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  });

const ffmpeg = createFFmpeg({ log: true });
loadFfmpeg(ffmpeg);

const telegramBotToken: string | undefined = process.env.TELEGRAM_BOT_TOKEN;

if (telegramBotToken == undefined) {
    logger.error('Telegram bot token undefined!');
    process.exit(1);
}

//@todo: Change <any> to proper type
const uploadWizardScene: Scenes.WizardScene<any> = new Scenes.WizardScene(
  'upload-wizard',
  async (ctx) => {
    await ctx.reply('Please upload your file.');
    return ctx.wizard.next();
  },
  async (ctx) => {
    await ctx.reply('Downloading, please wait.');

    const sender = ctx.message.from;
    const senderFullInfo = `id(${sender.id}) ${sender.first_name} ${sender.last_name} (${sender.username}) `;

    const video = ctx.message.video;
    video.file_name = crypto.randomBytes(10).toString('hex') + '.mp4';

    if (video.file_size > 2000000) {
      await ctx.reply('File is bigger than 2 MB. Please use /upload again.');
      logger.info(senderFullInfo + ' uploaded file bigger than 2 MB');
      return await ctx.scene.leave();
    }

    if (video.duration > 2) {
      await ctx.reply('File is longer than 3 seconds. Please use /upload again.');
      logger.info(senderFullInfo + ' uploaded file longer than 3 s');
      return await ctx.scene.leave();
    }

    const downloadFolder = 'input';
    checkAndCreateFolder(downloadFolder);

    const fileUrl = await ctx.telegram.getFileLink(video.file_id);
    const inputFilePath = path.resolve(rootFolder, downloadFolder, video.file_name);

    const fileDownloadResponse = await axios({
      method: 'GET',
      url: fileUrl.href,
      responseType: 'stream',
    });

    fileDownloadResponse.data.pipe(fs.createWriteStream(inputFilePath));

    fileDownloadResponse.data.on('end', async () => {
      await ctx.reply('Successfuly downloaded! Please wait for file to process!');

      const webmFolder = 'output';
      checkAndCreateFolder(webmFolder);

      const outputFile = `${crypto.randomBytes(5).toString('hex')}_${video.file_name}.webm`;
      const outputFilePath = path.resolve(rootFolder, webmFolder, outputFile);

      logger.debug(`${senderFullInfo} file ${video.file_name} ffmpeg start`);
      ffmpeg.setLogger(async ({ type, message }) => {
        if (type == 'info') {
          logger.debug(message);
        }

        if (type == 'fferr') {
          logger.error(`${senderFullInfo} file ${video.file_name} got error on ffmpeg: ${message}`);
          await ctx.reply('Some error occured on processing, sorry for that!');
          return await ctx.scene.leave();
        }
      });
      ffmpeg.FS('writeFile', video.file_name, await fetchFile(inputFilePath));
      await ffmpeg.run(
        '-i', video.file_name,
        '-an',
        '-c:v', 'libvpx-vp9',
        '-crf', '50',
        '-b:v', '0',
        '-filter:v', 'scale=512:512',
        '-loglevel', 'error',
        outputFile
      );
      await fs.promises.writeFile(outputFilePath, ffmpeg.FS('readFile', outputFile));
      logger.debug(`${senderFullInfo} file ${video.file_name} ffmpeg end`);

      await ctx.reply('Video was successfuly processed and sent!');

      fs.unlink(inputFilePath, (err) => {});

      await ctx.telegram.sendMessage(process.env.OWNER_CHAT_ID, senderFullInfo);
      await ctx.telegram.forwardMessage(
        process.env.OWNER_CHAT_ID,
        ctx.message.chat.id,
        ctx.message.message_id
      );
      await ctx.telegram.sendDocument(
        process.env.OWNER_CHAT_ID,
        {
          source: outputFilePath
        }
      );
      logger.info(`${senderFullInfo} file ${video.file_name} was processed and sent`);

      fs.unlink(outputFilePath, (err) => {});

      return await ctx.scene.leave();
    });

    fileDownloadResponse.data.on('error', async () => {
      logger.error(`${senderFullInfo} file ${video.file_name} got error on file download`);
      await ctx.reply('Some error occured on file downloading, sorry for that!');
      return await ctx.scene.leave();
    });
  }
);

const bot: Telegraf = new Telegraf(telegramBotToken);

const stage = new Scenes.Stage(
  [uploadWizardScene]
);

bot.use(session());
bot.use(stage.middleware());

bot.command('upload', (ctx: any) => {
  ctx.scene.enter('upload-wizard');
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

async function loadFfmpeg(ffmpeg: FFmpeg) {
  await ffmpeg.load();
}

function checkAndCreateFolder(folderName: string) {
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
  }
}