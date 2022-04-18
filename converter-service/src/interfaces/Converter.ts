import { Logger } from "winston";
import { FFmpeg } from '@ffmpeg/ffmpeg';

export interface Converter {
    ffmpeg: FFmpeg;

    convertToWebm();
}