import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Button,
  TextField,
  Chip,
} from "@mui/material";
import CakeIcon from "@mui/icons-material/Cake";
import EditBirthdayModal from "./EditBirthdayModal";

const apiUrl = "http://localhost:3001";

export default function BirthdayList() {
  const [list, setList] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    birthday: "",
  });
  const [search, setSearch] = useState("");

  // cargar datos
  useEffect(() => {
    fetch(`${apiUrl}/api/customers`)
      .then((res) => res.json())
      .then(setList);
  }, []);

  // filtro
  const filteredList = list.filter((p) =>
    `${p.name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()),
  );

  // abrir modal
  const openModal = (p) => {
    setSelectedPerson(p);
    setFormData(p);
    setOpen(true);
  };

  // guardar cambios
  const handleSave = async () => {
    await fetch(`${apiUrl}/api/customers/${selectedPerson.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setList((prev) =>
      prev.map((p) => (p.id === selectedPerson.id ? { ...p, ...formData } : p)),
    );

    setOpen(false);
  };

  // borrar
  const handleDelete = async (id) => {
    await fetch(`${apiUrl}/api/customers/${id}`, {
      method: "DELETE",
    });

    setList((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <Box sx={{ maxWidth: 700 }}>
      {/* HEADER */}
      <Typography variant="h4" mb={2} fontWeight="bold">
        📋 Lista de cumpleaños
      </Typography>

      {/* BUSCADOR */}
      <TextField
        placeholder="Buscar por nombre..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 3 }}
      />

      {/* RESULTADOS */}
      <Stack spacing={2}>
        {filteredList.map((p) => (
          <Paper
            key={p.id}
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 3,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "0.2s",
              "&:hover": {
                transform: "scale(1.01)",
                backgroundColor: "#fafafa",
              },
            }}
          >
            {/* INFO */}
            <Stack direction="row" spacing={2} alignItems="center">
              <CakeIcon />
              <Box>
                <Typography fontWeight="bold">
                  {p.name} {p.last_name}
                </Typography>
                <Typography fontSize={13} color="gray">
                  {p.birthday}
                </Typography>
              </Box>
            </Stack>

            {/* ACCIONES */}
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => openModal(p)}>
                Editar
              </Button>

              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={() => handleDelete(p.id)}
              >
                Borrar
              </Button>
            </Stack>
          </Paper>
        ))}

        {/* EMPTY */}
        {filteredList.length === 0 && (
          <Typography color="gray">No se encontraron resultados</Typography>
        )}
      </Stack>

      {/* MODAL */}
      <EditBirthdayModal
        open={open}
        formData={formData}
        onChange={(e) =>
          setFormData({
            ...formData,
            [e.target.name]: e.target.value,
          })
        }
        onClose={() => setOpen(false)}
        onSave={handleSave}
      />
    </Box>
  );
}
