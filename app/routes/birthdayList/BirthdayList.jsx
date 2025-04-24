import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router";

export default function BirthdayList() {
  const [birthdayList, setBirthdayList] = useState([]);
  const navigate = useNavigate();

  // Cargar lista de la API
  useEffect(() => {
    async function fetchData() {
      try {
        // const response = await fetch("https://LISTARAPI");
        const response = await fetch(
          "https://servidorossa.ddns.net/api/customers"
        );
        if (!response.ok) {
          throw new Error("Error al obtener la lista");
        }
        const data = await response.json();
        setBirthdayList(data);
      } catch (error) {
        console.error(error);
        alert("Hubo un problema al obtener la lista de cumpleaños.");
      }
    }

    fetchData();
  }, []);

  const handleEdit = (id) => {
    // Navegar a la página de edición
    navigate(`/edit/${id}`);
  };

  const handleDelete = async (id) => {
    // Lógica para borrar registro en tu backend
    try {
      // const response = await fetch(`http://localhost:3001/api/customers/${id}`, {
      const response = await fetch(
        `https://servidorossa.ddns.net/api/customers/${id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Error al borrar el registro");
      }
      // Actualizar lista en el estado local
      const newList = birthdayList.filter((item) => item.id !== id);
      setBirthdayList(newList);
      alert("¡Registro borrado exitosamente!");
    } catch (error) {
      console.error("Error al borrar:", error);
      alert("Hubo un problema al borrar el registro.");
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Apellido</TableCell>
            <TableCell>Teléfono</TableCell>
            <TableCell>Fecha de Nacimiento</TableCell>
            <TableCell>Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {birthdayList.map((person) => (
            <TableRow key={person.id}>
              <TableCell>{person.name}</TableCell>
              <TableCell>{person.last_name}</TableCell>
              <TableCell>{person.phone}</TableCell>
              <TableCell>{person.birthday}</TableCell>
              <TableCell>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={() => handleDelete(person.id)}
                >
                  Borrar
                </Button>
              </TableCell>
            </TableRow>
          ))}

          {birthdayList.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No hay registros
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
