import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function TextViewer({ content, title }) {
  return (
    <div className="bg-[#1a1e29] rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <div className="prose prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export default TextViewer;