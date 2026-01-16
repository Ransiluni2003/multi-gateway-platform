import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import CartView from "@/components/CartView";

export default function CartPage() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Cart
      </Typography>
      <CartView />
    </Container>
  );
}
