const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCentsAsCurrency(cents) {
  return currencyFormatter.format(cents / 100);
}
