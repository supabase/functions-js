declare namespace Supabase {
  export interface ModelOptions {
    /**
     * Pool embeddings by taking their mean. Applies only for `gte-small` model
     */
    mean_pool?: boolean

    /**
     * Normalize the embeddings result. Applies only for `gte-small` model
     */
    normalize?: boolean

    /**
     * Stream response from model. Applies only for LLMs like `mistral` (default: false)
     */
    stream?: boolean

    /**
     * Automatically abort the request to the model after specified time (in seconds). Applies only for LLMs like `mistral` (default: 60)
     */
    timeout?: number
  }

  export class Session {
    /**
     * Create a new model session using given model
     */
    constructor(model: string, sessionOptions?: unknown)

    /**
     * Execute the given prompt in model session
     */
    run(prompt: string, modelOptions?: ModelOptions): unknown
  }

  /**
   * Provides AI related APIs
   */
  export interface Ai {
    readonly Session: typeof Session
  }

  /**
   * Provides AI related APIs
   */
  export const ai: Ai
}
