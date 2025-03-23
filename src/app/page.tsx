"use client"
import Link from 'next/link';

export default function Home() {

  return (
    <div className="bg-gray-100 p-4">
      <div className="">
        success
      </div>
      <div>
        <button type="button" className=" bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          <Link href="/login">Login</Link>
        </button>
      </div>
    </div>
  );
}

