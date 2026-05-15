import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicFeedbackForm from "@/components/feedback/PublicFeedbackForm";
import { ArrowLeft } from "lucide-react";

const Feedback = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-3xl w-full">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke beranda
        </Link>
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Kirim Masukan / Lapor Bug</h1>
          <p className="text-sm text-muted-foreground">
            Bantu kami menjadi lebih baik. Laporkan kendala, beri saran, atau permintaan revisi.
          </p>
        </div>
        <PublicFeedbackForm />
      </main>
      <Footer />
    </div>
  );
};

export default Feedback;