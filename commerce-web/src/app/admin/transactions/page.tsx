import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function TransactionsPage() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Transactions
      </Typography>
      <Typography>Transaction history will appear here.</Typography>
    </Container>
  );
}
