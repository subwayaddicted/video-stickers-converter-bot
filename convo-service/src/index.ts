import * as dotenv from "dotenv";
import * as winston from "winston";
import { Telegraf, Scenes, session } from 'telegraf';
import * as fs from "fs";
import * as amqp from "amqplib";

dotenv.config();

const logsFolder = 'logs';
checkAndCreateFolder(logsFolder);
const logger: winston.Logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    defaultMeta: { service: 'user-service' },
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
  });

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
    const sender = ctx.message.from;
    const senderFullInfo: string = `id(${sender.id}) ${sender.first_name} ${sender.last_name} (${sender.username}) `;

    const video = ctx.message.video;

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

    const queueName = 'converter';
    const msg: Object = {
      video: video,
      sender: sender
    };
    console.log('Before amqp');
    const connection = await amqp.connect('amqp://rabbitmq:5673');
    const channel = await connection.createChannel();
    await channel.assertQueue(queueName);
    await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(msg)));
    await channel.close();
    await connection.close();

    await ctx.reply('Thanks for submitting, the bot will update you on the status as soon as possible');
    return await ctx.scene.leave();
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

function checkAndCreateFolder(folderName: string) {
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
  }
}
