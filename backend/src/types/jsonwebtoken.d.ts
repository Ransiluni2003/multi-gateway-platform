declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
  }
}