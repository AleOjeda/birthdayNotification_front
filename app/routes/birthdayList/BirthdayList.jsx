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
import EditBirthdayModal from "./EditBirthdayModal";

export default function BirthdayList() {
  const [birthdayList, setBirthdayList] = useState([]);
  const navigate = useNavigate();
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    last_name: "",
    phone: "",
    birthday: "",
  });

  const handleOpenEditModal = (person) => {
    setSelectedPerson(person);
    setFormData({
      name: person.name,
      last_name: person.last_name,
      phone: person.phone,
      birthday: person.birthday,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPerson(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/customers/${selectedPerson.id}`,
        // `http://localhost:3001/api/customers/${selectedPerson.id}`,
        // `https://servidorossa.ddns.net/api/customers/${selectedPerson.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) throw new Error();

      setBirthdayList((prevList) =>
        prevList.map((p) =>
          p.id === selectedPerson.id ? { ...p, ...formData } : p
        )
      );

      handleCloseModal();
    } catch (error) {
      alert("Hubo un error al guardar los cambios.");
    }
  };

  // Cargar lista de la API
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `${apiUrl}/api/customers`,
          // "https://servidorossa.ddns.net/api/customers",
          // "http://localhost:3001/api/customers",
          { credentials: "include" }
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

  const handleDelete = async (id) => {
    // Lógica para borrar registro en tu backend
    try {
      const response = await fetch(
        `${apiUrl}/api/customers/${id}`,
        // `https://servidorossa.ddns.net/api/customers/${id}`,
        // `http://localhost:3001/api/customers/${id}`,
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
    <>
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
                    color="primary"
                    size="small"
                    onClick={() => handleOpenEditModal(person)}
                  >
                    Editar
                  </Button>
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
      <EditBirthdayModal
        open={isModalOpen}
        formData={formData}
        onChange={handleChange}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </>
  );
}
