import { PathGenerator } from "./PathGenerator";

export interface FileManager {
    pathGenerator: PathGenerator;

    checkAndCreateFolder(folderPath: string): void;
    downloadFile(fileUrl: string);
    deleteFile(path: string): void;
}