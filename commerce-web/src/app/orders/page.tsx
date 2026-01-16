import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function OrdersPage() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Orders
      </Typography>
      <Typography>No orders yet (placeholder).</Typography>
    </Container>
  );
}
