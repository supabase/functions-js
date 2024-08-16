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

  type PipelineTasks =
    | 'feature-extraction'
    | 'supabase-gte'
    | 'gte-small'
    | 'sentiment-analysis';

  /**
   * Pipelines provide a high-level, easy to use, API for running machine learning models.
   */
  export class Pipeline<K extends PipelineTasks> {
    /**
     * Create a new pipeline using given task
     * @param task The task of the pipeline.
     * @param variant Witch model variant to use by the pipeline.
     */
    constructor(task: K, variant?: string);

    /**
     * {@label pipeline-feature-extraction}
     *
     * Feature extraction pipeline using no model head. This pipeline extracts the hidden
     * states from the base transformer, which can be used as features in downstream tasks.
     *
     * **Example:** Instantiate pipeline using the `Pipeline` class.
     * ```javascript
     * const extractor = new Supabase.ai.Pipeline('feature-extraction');
     * const output = await extractor('This is a simple test.');
     *
     * // output: [0.05939, 0.02165, ...]
     *
     * ```
     *
     * **Example:** Batch inference, processing multiples in parallel
     * ```javascript
     * const extractor = new Supabase.ai.Pipeline('feature-extraction');
     * const output = await extractor(["I'd use Supabase in all of my projects", "Just a test for embedding"]);
     *
     * // output: [[0.07399, 0.01462, ...], [-0.08963, 0.01234, ...]]
     *
     * ```
     */
    run<I extends string | string[]>(
      input: K extends 'feature-extraction' ? I : never,
      opts?: FeatureExtractionOptions,
    ): Promise<I extends string[] ? FeatureExtractionOutput[] : FeatureExtractionOutput>;

    /**
     * Feature extraction pipeline using no model head.
     * This pipeline does the same as `'feature-extraction'` but using the `'Supabase/gte-small'` as default model.
     *
     * {@link run:pipeline-feature-extraction}
     */
    run<I extends string | string[]>(
      input: K extends 'supabase-gte' | 'gte-small' ? I : never,
      opts?: FeatureExtractionOptions,
    ): Promise<I extends string[] ? FeatureExtractionOutput[] : FeatureExtractionOutput>;

    /**
     * Text classification pipeline using any `ModelForSequenceClassification`.
     *
     * **Example:** Instantiate pipeline using the `Pipeline` class.
     * ```javascript
     * const classifier = new Supabase.ai.Pipeline('sentiment-analysis');
     * const output = await classifier('I love Supabase!');
     *
     * // output: {label: 'POSITIVE', score: 1.00}
     *
     * ```
     *
     * **Example:** Batch inference, processing multiples in parallel
     * ```javascript
     * const classifier = new Supabase.ai.Pipeline('sentiment-analysis');
     * const output = await classifier(['Cats are fun', 'Java is annoying']);
     *
     * // output: [{label: 'POSITIVE', score: 0.99 }, {label: 'NEGATIVE', score: 0.97}]
     *
     * ```
     */
    run<I extends string | string[]>(
      input: K extends 'sentiment-analysis' ? I : never,
    ): Promise<I extends string[] ? TextClassificationOutput[] : TextClassificationOutput>;
  }
}
