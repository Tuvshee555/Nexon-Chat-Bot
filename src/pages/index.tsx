import DemoChat from "@/components/DemoChat";
import Head from "next/head";

export default function Home() {
  return (
    <div className="min-h-screen p-6">
      <Head>
        <title>Mongolian AI Reception Demo</title>
      </Head>
      <main className="max-w-3xl mx-auto">
        <h1 className="text-2xl mb-4">Demo: Mongolian AI Reception</h1>
        <DemoChat />
      </main>
    </div>
  );
}
