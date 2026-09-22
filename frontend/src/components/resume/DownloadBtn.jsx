import { FiDownload } from "react-icons/fi";
import { useReactToPrint } from "react-to-print";

function DownloadBtn({ docRef }) {
  const handlePdf = useReactToPrint({
    contentRef: docRef,
    documentTitle: "PrepTracePDF",
  });

  return (
    <button
      onClick={() => handlePdf()}
      className="flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-xs text-white hover:bg-black/80 transition-all cursor-pointer shadow-sm"
    >
      <FiDownload />
      Download PDF
    </button>
  );
}

export default DownloadBtn;
