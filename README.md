# Custo

Custo lets a React feature define defaults for its components, text, and settings. The app can override those defaults for a single page or section by wrapping it in a provider.

## Quick start

To try a local checkout, run `npm pack` here and install the resulting `.tgz` file with `npm install` in your React app.

Call `buildCusto` once at module level. It gives you components to render and a `MergingProvider` to customize them.

```tsx
import { buildCusto, CreateCusto } from "custo";

const [Checkout, { MergingProvider: CheckoutProvider }] = buildCusto({
  defaultValue: {
    Button: CreateCusto.Component("button", { type: "submit" }),
    Label: CreateCusto.Text("Pay now"),
  },
});

function PayButton() {
  return (
    <Checkout.Button>
      <Checkout.Label />
    </Checkout.Button>
  );
}

const partnerOverrides = {
  Button: CreateCusto.Component("button", { className: "partner-button" }),
  Label: "Place order",
};

export function Example() {
  return (
    <>
      <PayButton />
      <CheckoutProvider value={partnerOverrides}>
        <PayButton />
      </CheckoutProvider>
    </>
  );
}
```

The first button says **Pay now**. The second says **Place order** and gets the `partner-button` class. Both inherit `type="submit"`. A provider applies to the components inside it, and omitted entries inherit from the surrounding provider or the original defaults.

## Advanced usage

### Read props and layer overrides

Use `.props()` with a function to compute defaults from the props passed to the component. Nest a provider when a section needs one more override.

```tsx
const partnerButton = CreateCusto.Component("button").props(({ disabled }) => ({
  className: disabled ? "partner-disabled" : "partner-button",
}));

<CheckoutProvider value={{ Button: partnerButton }}>
  <CheckoutProvider value={{ Label: "Confirm order" }}>
    <Checkout.Button disabled>
      <Checkout.Label />
    </Checkout.Button>
  </CheckoutProvider>
</CheckoutProvider>;
```

The inner provider sets the label and inherits the button definition. You can also pass a React component as a slot override to replace what it renders.

### Customize a value

Use `CreateCusto.Data` for a setting your feature reads inside a React component. A nested provider replaces the data value as a whole, including when the value is an object. Omitted slots inherit their values.

```tsx
const [Pricing, { MergingProvider: PricingProvider }] = buildCusto({
  defaultValue: { Currency: CreateCusto.Data("USD") },
});

function Price() {
  const currency = Pricing.Currency.use();
  return <span>{currency} 20</span>;
}

<PricingProvider value={{ Currency: "EUR" }}>
  <Price />
</PricingProvider>;
```
