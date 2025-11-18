import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
    requestId: string;
    userId?: string;
    productId?: string;
}

export const context = new AsyncLocalStorage<RequestContext>();

export const getRequestId = (): string | undefined => {
    const store = context.getStore();
    return store?.requestId;
};

export const getUserId = (): string | undefined => {
    const store = context.getStore();
    return store?.userId;
};

export const getProductId = (): string | undefined => {
    const store = context.getStore();
    return store?.productId;
};
