import { NextResponse } from "next/server";
import { z } from "zod";
import { authorizeHostRequest } from "../../../_lib/authorizeHost";

const PET_PHOTO_BUCKET = "pet-photos";
const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;

const petSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1).max(80),
  breed: z.string().trim().max(100).default(""),
  weight: z.string().max(20).default(""),
  age: z.string().max(40).default(""),
  gender: z.string().max(40).default(""),
  coatColor: z.string().max(80).default(""),
  vaccinated: z.boolean().default(false),
  neutered: z.boolean().default(false),
  friendly: z.boolean().default(true),
  calm: z.boolean().default(true),
  foodBrand: z.string().max(160).default(""),
  mealsPerDay: z.string().max(80).default(""),
  allergies: z.string().max(500).default(""),
  medication: z.string().max(500).default(""),
  specialNotes: z.string().max(2000).default(""),
  photoDataUrl: z.string().max(8_000_000).optional(),
  photoPath: z.string().max(500).optional()
});

const mutationSchema = z.object({
  customerSource: z.enum(["auth", "host"]),
  pet: petSchema
});

const deleteSchema = z.object({
  customerSource: z.enum(["auth", "host"]),
  petId: z.string().uuid(),
  photoPath: z.string().max(500).optional()
});

function numericWeight(value: string) {
  const parsed = Number(value.replace(/kg/gi, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function photoFile(dataUrl?: string) {
  if (!dataUrl?.startsWith("data:")) return null;
  const match = dataUrl.match(DATA_URL_PATTERN);
  if (!match) throw new Error("The selected pet photo could not be read.");
  const contentType = match[1];
  if (!contentType.startsWith("image/")) throw new Error("Pet photo must be an image file.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > 5_000_000) throw new Error("Pet photo must be smaller than 5 MB.");
  const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { buffer, contentType, extension };
}

async function mutatePet(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const authorization = await authorizeHostRequest(request, "crm.manage");
  if (!authorization.ok) return authorization.response;
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid pet details." }, { status: 400 });
  }

  const { customerId } = await context.params;
  const { customerSource, pet } = parsed.data;
  const table = customerSource === "host" ? "host_customer_pets" : "pets";
  const ownerColumn = customerSource === "host" ? "host_customer_id" : "owner_id";
  const payload = {
    [ownerColumn]: customerId,
    name: pet.name,
    breed: pet.breed,
    weight_kg: numericWeight(pet.weight),
    age_text: pet.age,
    gender: pet.gender,
    coat_color: pet.coatColor,
    vaccinated: pet.vaccinated,
    neutered: pet.neutered,
    friendly: pet.friendly,
    calm: pet.calm,
    food_brand: pet.foodBrand,
    meals_per_day: pet.mealsPerDay,
    allergies: pet.allergies,
    medication: pet.medication,
    special_notes: pet.specialNotes,
    photo_url: pet.photoDataUrl?.startsWith("data:") ? null : pet.photoDataUrl || null,
    photo_path: pet.photoPath || null
  };

  const isExisting = Boolean(pet.id && /^[0-9a-f-]{36}$/i.test(pet.id));
  const mutation = isExisting
    ? authorization.admin.from(table).update(payload).eq("id", pet.id!).eq(ownerColumn, customerId)
    : authorization.admin.from(table).insert(payload);
  const { data, error } = await mutation.select("id").maybeSingle();
  if (error) {
    console.error("[host/customers/pets] save failed", { message: error.message, code: error.code });
    return NextResponse.json({ error: "The pet profile could not be saved." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "The pet record no longer exists." }, { status: 404 });

  let photoUrl = payload.photo_url;
  let photoPath = payload.photo_path;
  try {
    const file = photoFile(pet.photoDataUrl);
    if (file) {
      photoPath = `${customerSource === "host" ? "host-customers" : "customers"}/${customerId}/${data.id}/${Date.now()}.${file.extension}`;
      const { error: uploadError } = await authorization.admin.storage.from(PET_PHOTO_BUCKET).upload(photoPath, file.buffer, {
        contentType: file.contentType,
        upsert: true
      });
      if (uploadError) throw uploadError;
      photoUrl = authorization.admin.storage.from(PET_PHOTO_BUCKET).getPublicUrl(photoPath).data.publicUrl;
      const { error: linkError } = await authorization.admin.from(table)
        .update({ photo_url: photoUrl, photo_path: photoPath })
        .eq("id", data.id)
        .eq(ownerColumn, customerId);
      if (linkError) throw linkError;
    }
  } catch (error) {
    console.error("[host/customers/pets] photo save failed", error);
    return NextResponse.json({ error: "The pet profile was saved, but its photo could not be stored. Please retry the photo." }, { status: 500 });
  }

  await authorization.admin.from("host_audit_log").insert({
    actor_id: authorization.user.id,
    target_user_id: customerSource === "auth" ? customerId : null,
    action: isExisting ? "pet.updated_by_host" : "pet.created_by_host",
    entity_type: customerSource === "host" ? "host_customer_pet" : "pet",
    entity_id: data.id,
    details: { customerId, customerSource }
  });

  return NextResponse.json({
    persisted: true,
    pet: { ...pet, id: data.id, photoDataUrl: photoUrl || undefined, photoPath: photoPath || undefined }
  }, { status: isExisting ? 200 : 201 });
}

export async function POST(request: Request, context: { params: Promise<{ customerId: string }> }) {
  return mutatePet(request, context);
}

export async function PATCH(request: Request, context: { params: Promise<{ customerId: string }> }) {
  return mutatePet(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ customerId: string }> }) {
  const authorization = await authorizeHostRequest(request, "crm.manage");
  if (!authorization.ok) return authorization.response;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid pet deletion request." }, { status: 400 });

  const { customerId } = await context.params;
  const table = parsed.data.customerSource === "host" ? "host_customer_pets" : "pets";
  const ownerColumn = parsed.data.customerSource === "host" ? "host_customer_id" : "owner_id";
  const { data, error } = await authorization.admin.from(table)
    .delete()
    .eq("id", parsed.data.petId)
    .eq(ownerColumn, customerId)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "The pet profile could not be deleted." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "The pet record no longer exists." }, { status: 404 });

  if (parsed.data.photoPath) {
    const { error: photoError } = await authorization.admin.storage.from(PET_PHOTO_BUCKET).remove([parsed.data.photoPath]);
    if (photoError) console.warn("Pet was deleted, but its old photo could not be removed.", photoError);
  }
  await authorization.admin.from("host_audit_log").insert({
    actor_id: authorization.user.id,
    target_user_id: parsed.data.customerSource === "auth" ? customerId : null,
    action: "pet.deleted_by_host",
    entity_type: parsed.data.customerSource === "host" ? "host_customer_pet" : "pet",
    entity_id: parsed.data.petId,
    details: { customerId, customerSource: parsed.data.customerSource }
  });
  return NextResponse.json({ persisted: true });
}
