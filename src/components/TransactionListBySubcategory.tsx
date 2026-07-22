import React from "react";
import { useTranslation } from 'react-i18next';

import { useLiveQuery } from "dexie-react-hooks";
import { db, ParsedExpense } from "../db";
import {
  IonAccordionGroup,
  IonAccordion,
  IonItem,
  useIonRouter
} from "@ionic/react";

// App components
import FormattedDate from "./FormattedDate";
import FormatAmount from "./FormatAmount";
import CategoryIcon from "../components/CategoryIcon";

// Hooks
import { useCurrency } from "../context/CurrencyContext";

// Styles
import "../Main.css";
import "./TransactionItem.css";

interface SubcategoryGroup {
  subcategoryId: string;
  expenses: ParsedExpense[];
  total: number;
}

interface Props {
  groupedExpenses: SubcategoryGroup[];
  parentCategoryColor: string;
  parentIcon: string;
}

const SubcategoryExpenseList: React.FC<Props> = ({ groupedExpenses, parentCategoryColor, parentIcon }) => {
  const { t } = useTranslation();
  
  const { currency } = useCurrency();
  const router = useIonRouter();

  const subcategories = useLiveQuery(() => db.subcategories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());

  const getSubcategory = (subcategoryId: string) =>
    subcategories?.find((sc) => sc.subcategoryId === subcategoryId);

  const getAccountName = (accountId: string) =>
    accounts?.find((ac) => ac.accountId === accountId)?.accountName || "";

  const getAmount = (exp: ParsedExpense): number =>
    exp.expenseAmountAlt > 0
      ? exp.expenseAmountAlt
      : exp.expenseAmountTrip > 0
      ? exp.expenseAmountTrip
      : exp.expenseAmountDefault;

  if (!groupedExpenses.length) {
    return <div>{t('categories.no_exp_for_this_cat')}</div>;
  }

  const renderExpenseRows = (expList: ParsedExpense[]) =>
    expList.map((exp) => {
      const accountName = getAccountName(exp.accountId);
      const amount = getAmount(exp);

      return (
        <div
          className="transaction-category__row transaction-item"
          key={exp.expenseId}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/app/editexpense/${exp.expenseId}`, "forward");
          }}
        >
          <div className="transaction-category__date">
            <FormattedDate date={exp.expenseDate} format="monthDay" />
          </div>

          <div className="transaction-category__note-group">
            <span className="transaction-category__note">
              {exp.expenseNote}
              {exp.installmentIndex && exp.totalInstallments && (
                <span className="installment-label">
                  {" "}
                  ({exp.installmentIndex}/{exp.totalInstallments})
                </span>
              )}
            </span>
            <span className="card-label">{accountName}</span>
          </div>

          <div className="transaction-category__amount">
            <FormatAmount
              amount={amount / 100}
              currencyCode={exp.expenseCurrencyCode}
            />
          </div>
        </div>
      );
    });

  return (
    <IonAccordionGroup multiple={false}>
      {groupedExpenses.map(({ subcategoryId, expenses, total }) => {
        const subcategory = getSubcategory(subcategoryId);
        const subcategoryName =
          subcategoryId !== '' && subcategory
            ? subcategory.subcategoryName
            : t('categories.no_subcat');
        const iconName =
          subcategory?.subcategoryIcon || parentIcon;
        const color = subcategory?.subcategoryColor || parentCategoryColor;

        return (
          <IonAccordion key={subcategoryId} value={`subcat-${subcategoryId}`}>
            <IonItem slot="header" className="transaction-category__item">
              <div className="transaction-category__icon">
                <div className="transaction-category__left-col">
                  <CategoryIcon
                    iconName={iconName}
                    categoryColor={color}
                    isTransaction={true}
                  />
                </div>

                <div className="transaction-category__center-col">
                  <div className="transaction-category__wrapper">
                    {subcategoryName}
                  </div>
                  <div className="flex">
                    <FormatAmount
                      amount={total / 100}
                      currencyCode={currency.defaultCurrency.code}
                    />
                  </div>
                </div>
              </div>
            </IonItem>

            <div slot="content">{renderExpenseRows(expenses)}</div>
          </IonAccordion>
        );
      })}
    </IonAccordionGroup>
  );
};

export default SubcategoryExpenseList;
