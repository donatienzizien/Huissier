import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  Heading2,
} from 'lucide-react';

interface Props {
  contenuInitial: string;
  onChange: (html: string) => void;
}

// Editeur de texte riche (WYSIWYG) pour le corps d'un acte - permet une
// edition complete et libre du document avant enregistrement, comme un
// traitement de texte classique. Le style visuel (police, marges) reste
// gere par le bloc <style> du modele, non touche par cet editeur : celui-ci
// n'edite que le contenu du <body>.
export default function EditeurActe({ contenuInitial, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: contenuInitial,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'editeur-acte-contenu focus:outline-none',
      },
    },
  });

  // Si le contenu initial change apres coup (ex: nouvel apercu genere),
  // on resynchronise l'editeur - sans cela Tiptap ignore les changements
  // de prop une fois monte.
  useEffect(() => {
    if (editor && contenuInitial !== editor.getHTML()) {
      editor.commands.setContent(contenuInitial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contenuInitial]);

  if (!editor) return null;

  function BoutonBarre({
    actif,
    onClick,
    children,
    titre,
  }: {
    actif?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    titre: string;
  }) {
    return (
      <button
        type="button"
        title={titre}
        onClick={onClick}
        className={`p-1.5 rounded-md transition-colors ${
          actif ? 'bg-navy-100 text-navy-900' : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 flex-wrap bg-gray-50 border-b border-gray-200 px-2 py-1.5">
        <BoutonBarre titre="Gras" actif={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </BoutonBarre>
        <BoutonBarre titre="Italique" actif={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </BoutonBarre>
        <BoutonBarre titre="Souligne" actif={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </BoutonBarre>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <BoutonBarre
          titre="Titre"
          actif={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={15} />
        </BoutonBarre>
        <BoutonBarre titre="Liste a puces" actif={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </BoutonBarre>
        <BoutonBarre titre="Liste numerotee" actif={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </BoutonBarre>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <BoutonBarre titre="Annuler" onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={15} />
        </BoutonBarre>
        <BoutonBarre titre="Retablir" onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={15} />
        </BoutonBarre>
      </div>
      <div className="bg-white p-6 max-h-[50vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
