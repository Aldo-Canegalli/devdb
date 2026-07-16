import Editor from '@monaco-editor/react';

function CodeEditor({ code, language, onChange, readOnly = false }) {
  const getLanguage = (lang) => {
    const map = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return map[lang] || 'plaintext';
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height="500px"
        language={getLanguage(language)}
        value={code}
        onChange={onChange}
        theme="vs-dark"
        options={{
          readOnly: readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on'
        }}
      />
    </div>
  );
}

export default CodeEditor;