export interface SetupConfig {
    ffmpeg: string | null;
    ffprobe: string | null;
    ffmpegVersion: {
        major: number;
        minor: number;
        patch: number;
        full: string;
    } | null;
    available: boolean;
}

export interface SetupOptions {
    required?: boolean;
    install?: boolean;
    silent?: boolean;
}

export interface CliOptions {
    install: boolean;
    silent: boolean;
    checkOnly: boolean;
    json: boolean;
}
