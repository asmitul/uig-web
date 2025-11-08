import { useEffect, useMemo, useState } from 'react';
import './App.css';
import mockDictionary from './data/mockDictionary.json';

function App() {
  const [query, setQuery] = useState('');
  const [words, setWords] = useState([]);
  const [newUyghur, setNewUyghur] = useState('');
  const [newEnglish, setNewEnglish] = useState('');
  const [newTurkish, setNewTurkish] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadWords = async () => {
      try {
        const response = await fetch('https://api.uig.me/api/v1/words');
        const data = await response.json();

        if (isMounted) {
          setWords(data);
        }
      } catch (error) {
        console.error('Failed to fetch words:', error);

        if (isMounted) {
          setWords(mockDictionary);
        }
      }
    };

    loadWords();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return words;
    }

    return words.filter((entry) => {
      const uyghur = entry.word_uyghur.toLowerCase();
      const english = entry.word_english.toLowerCase();
      return (
        uyghur.includes(normalizedQuery) ||
        english.includes(normalizedQuery)
      );
    });
  }, [query, words]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    const trimmedUyghur = newUyghur.trim();
    const trimmedEnglish = newEnglish.trim();
    const trimmedTurkish = newTurkish.trim();

    if (!trimmedUyghur || !trimmedEnglish || !trimmedTurkish) {
      setSubmitError('Please fill in all fields before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://api.uig.me/api/v1/words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          word_uyghur: trimmedUyghur,
          word_english: trimmedEnglish,
          word_turkish: trimmedTurkish,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to add the word. Please try again later.';

        try {
          const errorBody = await response.json();
          if (typeof errorBody?.detail === 'string') {
            errorMessage = errorBody.detail;
          }
        } catch {
          // Ignore JSON parsing errors and fall back to the default message.
        }

        setSubmitError(errorMessage);
        return;
      }

      const createdWord = await response.json();

      setWords((previousWords) => [createdWord, ...previousWords]);
      setSubmitSuccess('Word added successfully!');
      setNewUyghur('');
      setNewEnglish('');
      setNewTurkish('');
    } catch (error) {
      console.error('Failed to add word:', error);

      const isNetworkError =
        error instanceof TypeError ||
        (typeof error.message === 'string' &&
          (error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')));

      if (isNetworkError) {
        const fallbackWord = {
          id: Date.now(),
          word_uyghur: trimmedUyghur,
          word_english: trimmedEnglish,
          word_turkish: trimmedTurkish,
          pronunciation_url: '',
        };

        setWords((previousWords) => [fallbackWord, ...previousWords]);
        setSubmitSuccess('Word added successfully! (saved locally)');
        setNewUyghur('');
        setNewEnglish('');
        setNewTurkish('');
      } else {
        setSubmitError('Failed to add the word. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="App">
      <main className="dictionary">
        <h1 className="title">Uyghur Dictionary</h1>
        <input
          type="text"
          className="search"
          placeholder="Search by Uyghur or English word"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoFocus
        />
        <section className="form-section" aria-live="polite">
          <h2 className="section-title">Add a new word</h2>
          <form className="word-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Uyghur</span>
                <input
                  type="text"
                  value={newUyghur}
                  onChange={(event) => setNewUyghur(event.target.value)}
                  placeholder="Uyghur word"
                  disabled={isSubmitting}
                  required
                />
              </label>
              <label className="form-field">
                <span className="form-label">English</span>
                <input
                  type="text"
                  value={newEnglish}
                  onChange={(event) => setNewEnglish(event.target.value)}
                  placeholder="English translation"
                  disabled={isSubmitting}
                  required
                />
              </label>
              <label className="form-field">
                <span className="form-label">Turkish</span>
                <input
                  type="text"
                  value={newTurkish}
                  onChange={(event) => setNewTurkish(event.target.value)}
                  placeholder="Turkish translation"
                  disabled={isSubmitting}
                  required
                />
              </label>
            </div>
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add word'}
            </button>
          </form>
          {submitError && <p className="form-feedback error">{submitError}</p>}
          {submitSuccess && <p className="form-feedback success">{submitSuccess}</p>}
        </section>
        <ul className="results" aria-live="polite">
          {filteredEntries.length === 0 ? (
            <li className="empty">No matches found.</li>
          ) : (
            filteredEntries.map((entry) => (
              <li key={entry.id} className="entry">
                <div className="entry-word uyghur">{entry.word_uyghur}</div>
                <div className="entry-word english">{entry.word_english}</div>
                <div className="entry-word turkish">{entry.word_turkish}</div>
              </li>
            ))
          )}
        </ul>
      </main>
    </div>
  );
}

export default App;
