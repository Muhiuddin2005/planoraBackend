import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const createToken = (payload: JwtPayload, secret: string, expiresIn: string) => {
    return jwt.sign(payload, secret, { expiresIn: expiresIn as SignOptions["expiresIn"] });
};

const verifyToken = (token: string, secret: string) => {
    return jwt.verify(token, secret) as JwtPayload;
};

export const jwtUtils = { createToken, verifyToken };
