declare module "midtrans-client" {
  export class Snap {
    constructor(config: { serverKey: string; clientKey: string; isProduction: boolean });
    createTransaction(parameter: any): Promise<{ token: string; redirect_url?: string }>;
  }

  export namespace Midtrans {
    class Snap {
      constructor(config: { serverKey: string; clientKey: string; isProduction: boolean });
      createTransaction(parameter: any): Promise<{ token: string; redirect_url?: string }>;
    }
  }
}
