export interface PathGenerator {
    inputFolderName: string;
    outputFolderName: string;
    rootFolderPath: string;
    inputFileName: string;
    outputFileName: string;

    getInputFilePath(): string;
    getOutputFilePath(): string;
}