import * as dotenv from "dotenv";
import { Telegraf } from 'telegraf';
import { Converter } from "./classes/Converter";
import { QueueMessage } from "./interfaces/QueueMessage";
import { QueueConnection } from "./classes/QueueConnection";
import { LocalFileManager } from './classes/LocalFileManager';
import { LocalPathGenerator } from "./classes/LocalPathGenerator";

dotenv.config();

// const logger: winston.Logger = winston.createLogger({
//     level: 'info',
//     format: winston.format.json(),
//     defaultMeta: { service: 'user-service' },
//     transports: [
//       new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
//       new winston.transports.File({ filename: 'logs/ffmpeg.log', level: 'debug' }),
//       new winston.transports.File({ filename: 'logs/combined.log' }),
//     ],
//   });

const telegramBotToken: string | undefined = process.env.TELEGRAM_BOT_TOKEN;

if (telegramBotToken == undefined) {
    // logger.error('Telegram bot token undefined!');
    process.exit(1);
}

const bot: Telegraf = new Telegraf(telegramBotToken);

// bot.launch();

async function testrabbit() {
  const queueConnection: QueueConnection = new QueueConnection();
  const channel = await queueConnection.createChannel();
  channel.consume(queueConnection.queueName, async message => {
    if (message == null) {
      return;
    }

    const queueMessage: QueueMessage = JSON.parse(message.content.toString());
    channel.ack(message);

    const localPathGenerator = new LocalPathGenerator('input', 'output');
    const localFileManager = new LocalFileManager(localPathGenerator);
    localFileManager.checkAndCreateFolder('input');
    localFileManager.checkAndCreateFolder('output');
    const converter = new Converter(localPathGenerator);

    const fileUrl = await bot.telegram.getFileLink(queueMessage.video.file_id);
    await localFileManager.downloadFile(fileUrl.href);

    await converter.convertToWebm();

    localFileManager.deleteFile(localPathGenerator.getInputFilePath());
    localFileManager.deleteFile(localPathGenerator.getOutputFilePath());

    // await bot.telegram.sendMessage(process.env.OWNER_CHAT_ID != undefined ? process.env.OWNER_CHAT_ID : '', queueMessage.sender.first_name);
    // await bot.telegram.forwardMessage(
    //   process.env.OWNER_CHAT_ID,
    //   ctx.message.chat.id,
    //   ctx.message.message_id
    // );
    // await bot.telegram.sendDocument(
    //   process.env.OWNER_CHAT_ID != undefined ? process.env.OWNER_CHAT_ID : '',
    //   {
    //     source: localPathGenerator.getOutputFilePath()
    //   }
    // );
  });
}

testrabbit();


// const sender = ctx.message.from;
// const senderFullInfo: string = `id(${sender.id}) ${sender.first_name} ${sender.last_name} (${sender.username}) `;

// const video = ctx.message.video;
// video.file_name = crypto.randomBytes(10).toString('hex') + '.mp4';

// const fileUrl = await ctx.telegram.getFileLink(video.file_id);
// const inputFilePath = path.resolve(rootFolder, downloadFolder, video.file_name);

// const fileDownloadResponse = await axios({
//   method: 'GET',
//   url: fileUrl.href,
//   responseType: 'stream',
// });

// fileDownloadResponse.data.pipe(fs.createWriteStream(inputFilePath));

// fileDownloadResponse.data.on('end', async () => {
//   await ctx.reply('Successfuly downloaded! Please wait for file to process!');

//   const outputFile: string = `${crypto.randomBytes(5).toString('hex')}_${video.file_name}.webm`;
//   const outputFilePath: string = path.resolve(rootFolder, webmFolder, outputFile);

//   logger.debug(`${senderFullInfo} file ${video.file_name} ffmpeg start`);
//   ffmpeg.setLogger(async ({ type, message }) => {
//     if (type == 'info') {
//       logger.debug(message);
//     }

//     if (type == 'fferr') {
//       logger.error(`${senderFullInfo} file ${video.file_name} got error on ffmpeg: ${message}`);
//       await ctx.reply('Some error occured on processing, sorry for that!');
//       return await ctx.scene.leave();
//     }
//   });

//   ffmpeg.FS('writeFile', video.file_name, await fetchFile(inputFilePath));
//   await ffmpeg.run(
//     '-i', video.file_name,
//     '-an',
//     '-c:v', 'libvpx-vp9',
//     '-crf', '50',
//     '-b:v', '0',
//     '-filter:v', 'scale=512:512',
//     '-loglevel', 'error',
//     outputFile
//   );
//   await fs.promises.writeFile(outputFilePath, ffmpeg.FS('readFile', outputFile));
//   logger.debug(`${senderFullInfo} file ${video.file_name} ffmpeg end`);

//   await ctx.reply('Video was successfuly processed and sent!');

//   fs.unlink(inputFilePath, (err) => {});

//   await ctx.telegram.sendMessage(process.env.OWNER_CHAT_ID, senderFullInfo);
//   await ctx.telegram.forwardMessage(
//     process.env.OWNER_CHAT_ID,
//     ctx.message.chat.id,
//     ctx.message.message_id
//   );
//   await ctx.telegram.sendDocument(
//     process.env.OWNER_CHAT_ID,
//     {
//       source: outputFilePath
//     }
//   );
//   logger.info(`${senderFullInfo} file ${video.file_name} was processed and sent`);

//   fs.unlink(outputFilePath, (err) => {});

//   return await ctx.scene.leave();
// });

// fileDownloadResponse.data.on('error', async () => {
//   logger.error(`${senderFullInfo} file ${video.file_name} got error on file download`);
//   await ctx.reply('Some error occured on file downloading, sorry for that!');
//   return await ctx.scene.leave();
// });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));