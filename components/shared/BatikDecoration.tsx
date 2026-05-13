import Image from "next/image";

export default function BatikDecoration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <Image
        src="/batik-bg.png"
        alt=""
        fill
        className="object-cover opacity-10"
        priority
      />
    </div>
  );
}
