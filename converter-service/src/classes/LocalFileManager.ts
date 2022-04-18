import { FileManager } from '../interfaces/FileManager';
import * as fs from 'fs';
import axios from 'axios';
import * as stream from 'stream';
import { promisify } from "util";
import { PathGenerator } from "../interfaces/PathGenerator";

export class LocalFileManager implements FileManager {
    pathGenerator: PathGenerator;

    constructor(pathGenerator: PathGenerator) {
        this.pathGenerator = pathGenerator;
    }

    checkAndCreateFolder(folderPath: string): void {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
          }
    }

    async downloadFile(fileUrl: string): Promise<void> {
        const finishedDownload = promisify(stream.finished);
        const writer = fs.createWriteStream(this.pathGenerator.getInputFilePath());

        const fileDownloadResponse = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'stream',
        });

        fileDownloadResponse.data.pipe(writer);
        await finishedDownload(writer);
    }

    deleteFile(path: string): void {
        fs.unlink(path, (err) => {});
    }
    
}