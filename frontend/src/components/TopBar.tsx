import Link from "next/link";

export default function TopBar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="flex h-14 items-center px-4 max-w-md mx-auto">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-blue-600">
          RentEasy
        </Link>
      </div>
    </header>
  );
}
