import Head from "next/head";
import { MusicTimeline } from "../components/MusicTimeline";

export default function Home() {
  return (
    <>
      <Head>
        <title>StacyPilot Music Timeline</title>
        <meta name="description" content="Music timeline editor for StacyPilot light effects" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="min-h-screen bg-gray-900 text-white">
        <MusicTimeline />
      </main>
    </>
  );
}
