import * as Comlink from "comlink";
import type {
  Runtime,
  RuntimeConfig,
  ExecutionResult,
  InputSource,
  AffectDSL,
} from "@affectjs/core";
import type { RuntimeWorker } from "./worker/index";

export class BrowserRuntime implements Runtime {
  private worker: Worker | null = null;
  private remote: Comlink.Remote<RuntimeWorker> | null = null;
  private config: RuntimeConfig;

  constructor(config: RuntimeConfig) {
    this.config = config;
  }

  async ready(): Promise<void> {
    if (this.worker) return;

    // Use default worker if worker option is true or undefined
    if (this.config.worker !== false) {
      this.worker = new Worker(new URL("./worker/index.ts", import.meta.url), {
        type: "module",
      });
      this.remote = Comlink.wrap<RuntimeWorker>(this.worker);
      await this.remote.init(this.config);
    } else {
      console.warn("Main thread execution is not yet implemented.");
    }
  }

  async execute(dsl: AffectDSL, inputs?: Record<string, InputSource>): Promise<ExecutionResult> {
    if (!this.remote) await this.ready();
    if (!this.remote) throw new Error("Worker not ready");
    return await this.remote.execute(dsl, inputs);
  }

  async terminate(): Promise<void> {
    if (this.remote) {
      this.remote[Comlink.releaseProxy]();
    }
    this.worker?.terminate();
    this.worker = null;
    this.remote = null;
  }

  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.remote) {
      this.ready().then(() => this.on(event, callback));
      return;
    }
    this.remote.addEventListener(event, Comlink.proxy(callback));
  }
}
