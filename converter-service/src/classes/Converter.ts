import { createFFmpeg, fetchFile, FFmpeg } from "@ffmpeg/ffmpeg";
import { Converter as IConverter } from "../interfaces/Converter";
import * as fs from 'fs';
import { PathGenerator } from "../interfaces/PathGenerator";

export class Converter implements IConverter {
    ffmpeg: FFmpeg;
    pathGenerator: PathGenerator;

    constructor(pathGenerator: PathGenerator) {
        this.ffmpeg = createFFmpeg({ log: true });
        this.pathGenerator = pathGenerator;
    }

    async convertToWebm(): Promise<void> {
        if (!this.ffmpeg.isLoaded()) {
            await this.ffmpeg.load();
        }

        // this.ffmpeg.setLogger(async ({ type, message }) => {
            // if (type == 'info') {
            //     logger.debug(message);
            // }

            // if (type == 'fferr') {
            //     logger.error(`${senderFullInfo} file ${video.file_name} got error on ffmpeg: ${message}`);
            //     await ctx.reply('Some error occured on processing, sorry for that!');
            //     return await ctx.scene.leave();
            // }
        // });

        this.ffmpeg.FS('writeFile', this.pathGenerator.inputFileName, await fetchFile(this.pathGenerator.getInputFilePath()));
        await this.ffmpeg.run(
            '-i', this.pathGenerator.inputFileName,
            '-an',
            '-c:v', 'libvpx-vp9',
            '-crf', '50',
            '-b:v', '0',
            '-filter:v', 'scale=512:512',
            '-loglevel', 'error',
            this.pathGenerator.outputFileName
        );
        await fs.promises.writeFile(this.pathGenerator.getOutputFilePath(), this.ffmpeg.FS('readFile', this.pathGenerator.outputFileName));
    }
}