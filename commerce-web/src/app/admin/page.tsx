import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { Box, Button, Card, CardContent, Stack } from "@mui/material";
import Link from "next/link";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SettingsIcon from "@mui/icons-material/Settings";

export default function AdminPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Admin Dashboard
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ flexWrap: "wrap" }}>
        {/* Orders Management */}
        <Card sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(33.33% - 16px)" }, minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <ShoppingCartIcon color="primary" />
              <Typography variant="h6">Orders</Typography>
            </Box>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              Manage orders, view details, and process refunds
            </Typography>
            <Link href="/admin/orders" style={{ textDecoration: "none" }}>
              <Button fullWidth variant="contained">
                Go to Orders
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Products Management */}
        <Card sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(33.33% - 16px)" }, minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Products</Typography>
            </Box>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              Manage product inventory and details
            </Typography>
            <Link href="/admin/products" style={{ textDecoration: "none" }}>
              <Button fullWidth variant="contained">
                Go to Products
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card sx={{ flex: { xs: "1 1 100%", sm: "1 1 calc(33.33% - 16px)" }, minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <SettingsIcon color="primary" />
              <Typography variant="h6">Transactions</Typography>
            </Box>
            <Typography color="textSecondary" sx={{ mb: 2 }}>
              View payment transactions and webhooks
            </Typography>
            <Link href="/admin/transactions" style={{ textDecoration: "none" }}>
              <Button fullWidth variant="contained">
                Go to Transactions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </Stack>
    </Container>
  );
}
