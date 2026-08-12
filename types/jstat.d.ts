/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "jstat" {
  const jStat: {
    mean(arr: number[]): number;
    median(arr: number[]): number;
    mode(arr: number[]): number | number[];
    variance(arr: number[], flag?: boolean): number;
    stdev(arr: number[], flag?: boolean): number;
    sum(arr: number[]): number;
    min(arr: number[]): number;
    max(arr: number[]): number;
    range(arr: number[]): number;
    quartiles(arr: number[]): [number, number, number];
    corrcoeff(x: number[], y: number[]): number;
    covariance(x: number[], y: number[]): number;
    zscore(x: number, mean: number, stdev: number): number;
    normal: {
      pdf(x: number, mean: number, std: number): number;
      cdf(x: number, mean: number, std: number): number;
      inv(p: number, mean: number, std: number): number;
    };
    studentt: {
      pdf(x: number, df: number): number;
      cdf(x: number, df: number): number;
      inv(p: number, df: number): number;
    };
    [key: string]: any;
  };
  export = jStat;
}
