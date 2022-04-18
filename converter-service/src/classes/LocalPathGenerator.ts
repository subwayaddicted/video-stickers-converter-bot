import { PathGenerator } from '../interfaces/PathGenerator';
import * as path from 'path';
import { packageDirectorySync } from 'pkg-dir';
import crypto from 'crypto';

export class LocalPathGenerator implements PathGenerator {
    readonly inputFolderName: string;
    readonly outputFolderName: string;
    readonly rootFolderPath: string;
    readonly inputFileName: string;
    readonly outputFileName: string;

    constructor(inputFolderName: string, outputFolderName: string) {
        this.inputFolderName = inputFolderName;
        this.outputFolderName = outputFolderName;
        this.rootFolderPath = packageDirectorySync();
        this.inputFileName = crypto.randomBytes(10).toString('hex') + '.mp4';
        this.outputFileName = `${crypto.randomBytes(5).toString('hex')}_${this.inputFileName}.webm`
    }

    getInputFilePath(): string {
        const inputFolderPath = this.getPathTo(this.inputFolderName);
        return path.resolve(inputFolderPath, this.inputFileName);
    }
    getOutputFilePath(): string {
        const outputFolderPath = this.getPathTo(this.outputFolderName);
        return path.resolve(outputFolderPath, this.outputFileName);
    }

    private getPathTo(fileName: string): string {
        return path.resolve(this.rootFolderPath, fileName);
    }
}