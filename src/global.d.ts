declare module "file:*" {
  const value: string;
  export default value;
}

declare module "dir:*" {
  const value: { [key: string]: any };
  export default value;
}

declare type integer = number;
declare type FileSource = string | File;
