import {createHash,timingSafeEqual} from "node:crypto";
/** Midtrans's documented field order; no signature or key material in logs. */
export function verifiedMidtransSignature(orderId:unknown,statusCode:unknown,grossAmount:unknown,signatureKey:unknown,serverKey:string):boolean{
 if(!serverKey || typeof orderId!=="string" || typeof statusCode!=="string" || typeof grossAmount!=="string" || typeof signatureKey!=="string" || !/^[a-f0-9]{128}$/i.test(signatureKey))return false;
 const expected=createHash("sha512").update(orderId+statusCode+grossAmount+serverKey).digest();
 return timingSafeEqual(expected,Buffer.from(signatureKey,"hex"));
}
