export class AppError extends Error {
    public readonly errorCode: string;
    public readonly statusCode: number;
    public readonly suggestedFix?: string;
    public readonly context?: Record<string, any>;

    constructor(message: string, errorCode: string, statusCode: number = 500, suggestedFix?: string, context?: Record<string, any>) {
        super(message);
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.suggestedFix = suggestedFix;
        this.context = context;
        Error.captureStackTrace(this, this.constructor);
    }
}
