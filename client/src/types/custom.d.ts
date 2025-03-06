declare module 'speak-tts' {
  export default class Speech {
    constructor();
    init(config: {
      volume?: number;
      lang?: string;
      rate?: number;
      pitch?: number;
      splitSentences?: boolean;
    }): Promise<any>;
    speak(config: {
      text: string;
      queue?: boolean;
      listeners?: {
        onstart?: () => void;
        onend?: () => void;
        onerror?: (error: any) => void;
      };
    }): void;
    cancel(): void;
  }
}

declare module 'express-fileupload' {
  import { RequestHandler } from 'express';
  
  interface FileUploadOptions {
    createParentPath?: boolean;
    limits?: {
      fileSize?: number;
    };
  }
  
  interface UploadedFile {
    name: string;
    mv(path: string): Promise<void>;
    mimetype: string;
  }
  
  interface FileArray {
    [name: string]: UploadedFile | UploadedFile[];
  }
  
  interface Request {
    files?: FileArray;
  }
  
  function fileUpload(options?: FileUploadOptions): RequestHandler;
  export = fileUpload;
}