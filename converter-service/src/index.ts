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

async function convert() {
  const queueConnection: QueueConnection = new QueueConnection();
  const channel = await queueConnection.createChannel();
  channel.consume(queueConnection.queueName, async message => {
    if (message == null) {
      return;
    }

    const queueMessage: QueueMessage = JSON.parse(message.content.toString());

    const localPathGenerator = new LocalPathGenerator('input', 'output');
    const localFileManager = new LocalFileManager(localPathGenerator);
    localFileManager.checkAndCreateFolder('input');
    localFileManager.checkAndCreateFolder('output');
    const converter = new Converter(localPathGenerator);

    const fileUrl = await bot.telegram.getFileLink(queueMessage.video.file_id);
    await localFileManager.downloadFile(fileUrl.href);

    await converter.convertToWebm();

    await bot.telegram.sendDocument(
      process.env.OWNER_CHAT_ID ??= "",
      {
        source: localPathGenerator.getOutputFilePath()
      }
    );

    await queueConnection.reply(channel, message, true)

    channel.ack(message);

    localFileManager.deleteFile(localPathGenerator.getInputFilePath());
    localFileManager.deleteFile(localPathGenerator.getOutputFilePath());
  });
}

convert();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));