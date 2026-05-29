"use client";

import { useEffect, useState } from "react";
import { apiRequest, getSession, saveRecent } from "../lib/browserApi";
import { Button } from "../ui/Button";
import { Notice } from "../ui/Notice";

type Pet = {
  id: string;
  name: string;
  breed: string;
  weight_kg?: string;
  vaccine_status?: string;
  special_needs?: string;
};

export function PetProfilePanel() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadPets() {
    const session = getSession();
    if (!session) return;
    const data = await apiRequest<Pet[]>("/pets", { userId: session.user.id });
    setPets(data);
    if (data[0]?.id) saveRecent("pet", data[0].id);
  }

  useEffect(() => {
    loadPets().catch((err) => setError(err instanceof Error ? err.message : "Could not load pets."));
  }, []);

  async function createPet(formData: FormData) {
    setError("");
    const session = getSession();
    if (!session) {
      setError("Please login first.");
      return;
    }

    try {
      const pet = await apiRequest<Pet>("/pets", {
        method: "POST",
        userId: session.user.id,
        body: JSON.stringify({
          name: String(formData.get("name")),
          breed: String(formData.get("breed")),
          weightKg: Number(formData.get("weightKg")),
          vaccineStatus: String(formData.get("vaccineStatus")),
          habits: String(formData.get("habits")),
          specialNeeds: String(formData.get("specialNeeds")),
          hasAggression: false,
          hasFleas: false
        })
      });
      saveRecent("pet", pet.id);
      setMessage(`Saved ${pet.name}.`);
      await loadPets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pet.");
    }
  }

  return (
    <div className="interactivePanel">
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <form onSubmit={(event) => { event.preventDefault(); createPet(new FormData(event.currentTarget)); }} className="formGrid">
        <label className="field">Pet name<input name="name" defaultValue="Mochi" /></label>
        <label className="field">Breed<input name="breed" defaultValue="Poodle Mix" /></label>
        <label className="field">Weight kg<input name="weightKg" type="number" step="0.1" min="1" max="12" defaultValue="6.2" /></label>
        <label className="field">Vaccine<input name="vaccineStatus" defaultValue="valid" /></label>
        <label className="field wide">Habits<input name="habits" defaultValue="Sleeps with a blanket." /></label>
        <label className="field wide">Special needs<input name="specialNeeds" defaultValue="Bring own food and treats." /></label>
        <Button type="submit">Add pet profile</Button>
      </form>

      <div className="listStack">
        {pets.map((pet) => (
          <button className="dataCard" key={pet.id} onClick={() => saveRecent("pet", pet.id)}>
            <strong>{pet.name}</strong>
            <span>{pet.breed} · {pet.weight_kg ?? "?"}kg · vaccine {pet.vaccine_status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
