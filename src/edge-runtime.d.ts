declare namespace Supabase {
  /**
   * Provides AI related APIs
   */
  export interface Ai {
    readonly Session: typeof Session;
    readonly Pipeline: typeof Pipeline;
  }

  /**
   * Provides AI related APIs
   */
  export const ai: Ai;

  export interface ModelOptions {
    /**
     * Pool embeddings by taking their mean. Applies only for `gte-small` model
     */
    mean_pool?: boolean;

    /**
     * Normalize the embeddings result. Applies only for `gte-small` model
     */
    normalize?: boolean;

    /**
     * Stream response from model. Applies only for LLMs like `mistral` (default: false)
     */
    stream?: boolean;

    /**
     * Automatically abort the request to the model after specified time (in seconds). Applies only for LLMs like `mistral` (default: 60)
     */
    timeout?: number;

    /**
     * Mode for the inference API host. (default: 'ollama')
     */
    mode?: 'ollama' | 'openaicompatible';
    signal?: AbortSignal;
  }

  export class Session {
    /**
     * Create a new model session using given model
     */
    constructor(model: string, sessionOptions?: unknown);

    /**
     * Execute the given prompt in model session
     */
    run(
      prompt:
        | string
        | string[]
        | Omit<import('openai').OpenAI.Chat.ChatCompletionCreateParams, 'model' | 'stream'>,
      modelOptions?: ModelOptions,
    ): unknown;
  }

  /** Parameters specific to feature extraction pipelines. */
  export type FeatureExtractionOptions = {
    /** Pool embeddings by taking their mean. */
    mean_pool?: boolean;
    /** Whether or not to normalize the embeddings in the last dimension. */
    normalize?: boolean;
  };

  /** The features computed by the model.*/
  export type FeatureExtractionOutput = number[];

  /** The classifications computed by the model.*/
  export type TextClassificationOutput = {
    /** The label predicted. */
    label: string;
    /** The corresponding probability. */
    score: number;
  };

  /**
   * Pipelines provide a high-level, easy to use, API for running machine learning models.
   */
  export type PipelineTasks = {
    /**
     * Feature extraction pipeline using no model head. This pipeline extracts the hidden
     * states from the base transformer, which can be used as features in downstream tasks.
     *
     * **Example:** Instantiate pipeline using the `Pipeline` class.
     * ```javascript
     * const extractor = new Supabase.ai.Pipeline('feature-extraction');
     * const output = await extractor('This is a simple test.');
     *
     * // Embeddings: [0.05939, 0.02165, ...]
     *
     * ```
     */
    ['feature-extraction']: <T = string | string[]>(
      input: T,
      opts?: FeatureExtractionOptions,
    ) => Promise<T extends string[] ? FeatureExtractionOutput[] : FeatureExtractionOutput>;
    /**
     * Feature extraction pipeline using no model head.
     * This pipeline does the same as `'feature-extraction'` but using the `'Supabase/gte-small'` as default model.
     */
    ['supabase-gte']: PipelineTasks['feature-extraction'];
    /**
     * Feature extraction pipeline using no model head.
     * This pipeline does the same as `'feature-extraction'` but using the `'Supabase/gte-small'` as default model.
     */
    ['gte-small']: PipelineTasks['feature-extraction'];
    /**
     * Text classification pipeline using any `ModelForSequenceClassification`.
     *
     * **Example:** Instantiate pipeline using the `Pipeline` class.
     * ```javascript
     * const classifier = new Supabase.ai.Pipeline('sentiment-analysis');
     * const output = await classifier('I love Supabase!');
     *
     * // Sentiment: {'label': 'POSITIVE', 'score': 0.999817686}
     *
     * ```
     */
    ['sentiment-analysis']: <T = string | string[]>(
      input: T,
    ) => Promise<T extends string[] ? TextClassificationOutput[] : TextClassificationOutput>;
  };

  /**
   * Pipelines provide a high-level, easy to use, API for running machine learning models.
   */
  export class Pipeline<T extends keyof PipelineTasks> {
    /**
     * Create a new pipeline using given task
     * @param task The task of the pipeline.
     * @param variant Witch model variant to use by the pipeline.
     */
    constructor(task: T, variant?: string);

    /**
     * Executes the given input in the pipeline.
     */
    run: PipelineTasks[T];
  }
}
