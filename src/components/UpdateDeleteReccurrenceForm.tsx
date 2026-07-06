import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface OptionFormProps {
  onSelect: (value: string | null) => void;
}

const UpdateDeleteReccurrenceForm: React.FC<OptionFormProps> = ({ onSelect }) => {
  const { t } = useTranslation();
  
  const [selected, setSelected] = useState<string | null>(null);

  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(e.target.value);
  };

  const handleReset = () => {
    setSelected(null);
    onSelect(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        <input
          type="radio"
          name="option"
          value="this"
          checked={selected === 'this'}
          onChange={handleRadioChange}
        />
        {t('expenses.only_this_exp')}
      </label>
      <br />
      <label>
        <input
          type="radio"
          name="option"
          value="future"
          checked={selected === 'future'}
          onChange={handleRadioChange}
        />
        {t('expenses.this_and_future_exps')}
      </label>
      <br />
      <label>
        <input
          type="radio"
          name="option"
          value="all"
          checked={selected === 'all'}
          onChange={handleRadioChange}
        />
        {t('expenses.all_exps_in_series')}
      </label>
      <br />
      <button type="button" onClick={handleReset}>
        {t('common.reset')}
      </button>
      <button type="submit" disabled={!selected}>
        {t('common.select')}
      </button>
    </form>
  );
};

export default UpdateDeleteReccurrenceForm;
