declare module "@paystack/inline-js" {
  export type PaystackLoadResponse = {
    accessCode: string;
    customer: Record<string, unknown>;
    id: number;
  };

  export type PaystackTransaction = {
    id?: number;
    message?: string;
    reference: string;
  };

  export type PaystackError = {
    message?: string;
  };

  export type PaystackCallbacks = {
    onCancel?: () => void;
    onError?: (error: PaystackError) => void;
    onLoad?: (response: PaystackLoadResponse) => void;
    onSuccess?: (transaction: PaystackTransaction) => void | Promise<void>;
  };

  export default class PaystackPop {
    resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): void;
  }
}