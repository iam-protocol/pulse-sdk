/** Statistical summary of a time series */
export interface StatsSummary {
  mean: number;
  variance: number;
  skewness: number;
  kurtosis: number;
}

/** Feature vector from all sensor modalities */
export interface FeatureVector {
  audio: number[];
  motion: number[];
  touch: number[];
}

/** Concatenated feature vector for SimHash input */
export type FusedFeatureVector = number[];
