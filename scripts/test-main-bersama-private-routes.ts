import "../src/main-bersama/infrastructure/persistence/require-test-db";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { NextRequest } from "next/server";
import { db } from "../lib/db";
import { setTestUser } from "./fixtures/main-bersama/teacher-auth";

function req(route: string, method = "GET", body?: Record<string, unknown>) {
  return new NextRequest(`http://localhost${route}`, {
    method,
    ...(body
      ? {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
}
async function assertions() {
  const sets = await import("../app/api/guru/soal-set/route");
  const pack = await import("../app/api/guru/soal-set/[id]/route");
  const questions =
    await import("../app/api/guru/soal-set/[id]/questions/route");
  const usePack = await import("../app/api/guru/soal-set/[id]/use/route");
  const soals = await import("../app/api/guru/soal/route");
  const suffix = randomUUID();
  const users = await Promise.all(
    [0, 1].map((index) =>
      db.user.create({
        data: {
          supabaseId: `privacy-${suffix}-${index}`,
          email: `privacy-${suffix}-${index}@test.invalid`,
          fullName: `Guru QA ${index}`,
          role: "GURU",
        },
      }),
    ),
  );
  try {
    const [owner, other] = users;
    const packs = await Promise.all(
      users.map((user) =>
        db.soalSet.create({
          data: {
            title: "Private QA",
            kelas: "VII",
            creatorId: user.id,
            questions: {
              create: {
                text: "Rahasia QA",
                options: ["A", "B"],
                correctAnswer: "0",
                kelas: "VII",
                uploaderId: user.id,
              },
            },
          },
          include: { questions: true },
        }),
      ),
    );
    const [owned, foreign] = packs;
    const context = { params: Promise.resolve({ id: owned.id }) };
    const forge = `?supabaseId=${owner.supabaseId}`;
    setTestUser(null);
    assert.equal(
      (await sets.GET(req("/api/guru/soal-set" + forge))).status,
      401,
    );
    assert.equal(
      (await pack.GET(req("/api/guru/soal-set/" + owned.id + forge), context))
        .status,
      401,
    );
    assert.equal((await soals.GET(req("/api/guru/soal" + forge))).status, 401);
    assert.equal(
      (
        await sets.POST(
          req("/api/guru/soal-set", "POST", {
            title: "Spoof",
            kelas: "VII",
            supabaseId: owner.supabaseId,
          }),
        )
      ).status,
      401,
    );
    assert.equal(
      (
        await questions.POST(
          req("/api/guru/soal-set/" + owned.id + "/questions", "POST", {
            questionIds: [owned.questions[0].id],
            supabaseId: owner.supabaseId,
          }),
          context,
        )
      ).status,
      401,
    );
    setTestUser(other);
    const listing = await sets.GET(req("/api/guru/soal-set" + forge));
    const list = (await listing.json()) as { data: { id: string }[] };
    assert(list.data.some((item) => item.id === foreign.id));
    assert(!list.data.some((item) => item.id === owned.id));
    assert.equal(
      (await pack.GET(req("/api/guru/soal-set/" + owned.id + forge), context))
        .status,
      404,
    );
    assert.equal(
      (
        await pack.PUT(
          req("/api/guru/soal-set/" + owned.id + forge, "PUT", {
            title: "Forged",
          }),
          context,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await pack.DELETE(
          req("/api/guru/soal-set/" + owned.id + forge, "DELETE"),
          context,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await usePack.POST(
          req("/api/guru/soal-set/" + owned.id + "/use", "POST", {
            useType: "GAME",
          }),
          context,
        )
      ).status,
      404,
    );
    const personal = (await (
      await soals.GET(req("/api/guru/soal" + forge))
    ).json()) as { data: { id: string }[] };
    assert(!personal.data.some((item) => item.id === owned.questions[0].id));
    setTestUser(owner);
    assert.equal(
      (await pack.GET(req("/api/guru/soal-set/" + owned.id), context)).status,
      200,
    );
    assert.equal(
      (
        await usePack.POST(
          req("/api/guru/soal-set/" + owned.id + "/use", "POST", {
            useType: "GAME",
          }),
          context,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await questions.POST(
          req("/api/guru/soal-set/" + owned.id + "/questions", "POST", {
            questionIds: [foreign.questions[0].id],
          }),
          context,
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await sets.POST(
          req("/api/guru/soal-set", "POST", {
            title: "Invalid foreign import",
            kelas: "VII",
            questionIds: [foreign.questions[0].id],
          }),
        )
      ).status,
      404,
    );
    await questions.DELETE(
      req(
        `/api/guru/soal-set/${owned.id}/questions?questionId=${foreign.questions[0].id}`,
        "DELETE",
      ),
      context,
    );
    assert.equal(
      (
        await db.soal.findUniqueOrThrow({
          where: { id: foreign.questions[0].id },
        })
      ).soalSetId,
      foreign.id,
    );
    assert.equal(
      (
        await soals.PUT(
          req("/api/guru/soal", "PUT", {
            id: owned.questions[0].id,
            text: "Pemilik mengedit",
            uploaderId: other.id,
            soalSetId: foreign.id,
            supabaseId: other.supabaseId,
          }),
        )
      ).status,
      200,
    );
    const updated = await db.soal.findUniqueOrThrow({
      where: { id: owned.questions[0].id },
    });
    assert.equal(updated.text, "Pemilik mengedit");
    assert.equal(updated.uploaderId, owner.id);
    assert.equal(updated.soalSetId, owned.id);
    const visibility =
      await import("../app/api/main-bersama/teacher/question-packages/[id]/route");
    const library =
      await import("../app/api/main-bersama/teacher/question-packages/route");
    process.env.MAIN_BERSAMA_ALLOW_MUTATIONS = "1";
    const accessRequest = () =>
      req(`/api/main-bersama/teacher/question-packages/${owned.id}`, "PATCH", {
        isPublic: true,
      });
    setTestUser(null);
    assert.equal(
      (await visibility.PATCH(accessRequest(), context)).status,
      401,
    );
    setTestUser(owner);
    assert.equal(
      (await visibility.PATCH(accessRequest(), context)).status,
      200,
    );
    setTestUser(other);
    const publicList = (await (
      await library.GET(
        req("/api/main-bersama/teacher/question-packages?scope=public"),
      )
    ).json()) as {
      packages: { id: string; isOwner: boolean; questionCount: number }[];
    };
    const shared = publicList.packages.find((item) => item.id === owned.id);
    assert(
      shared &&
        !shared.isOwner &&
        shared.questionCount === 1 &&
        !("questions" in shared),
    );
    assert.equal(
      (await visibility.PATCH(accessRequest(), context)).status,
      404,
    );
    setTestUser(owner);
    assert.equal(
      (
        await visibility.PATCH(
          req(
            `/api/main-bersama/teacher/question-packages/${owned.id}`,
            "PATCH",
            { isPublic: false },
          ),
          context,
        )
      ).status,
      200,
    );
    setTestUser(other);
    const hidden = (await (
      await library.GET(
        req("/api/main-bersama/teacher/question-packages?scope=public"),
      )
    ).json()) as { packages: { id: string }[] };
    assert(!hidden.packages.some((item) => item.id === owned.id));
    console.log(
      "PASS: actual legacy routes reject forged identities, restrict private reads/edits/deletes/use, preserve authenticated ownership, and prevent cross-owner question moves.",
    );
  } finally {
    await db.soal.deleteMany({
      where: { uploaderId: { in: users.map((user) => user.id) } },
    });
    await db.user.deleteMany({
      where: { id: { in: users.map((user) => user.id) } },
    });
    await db.$disconnect();
  }
}
async function run() {
  if (process.env.BC_PRIVATE_ROUTE_BUNDLE === "1") return assertions();
  const cacheRoot = path.resolve("node_modules/.cache");
  await fs.mkdir(cacheRoot, { recursive: true });
  const directory = await fs.mkdtemp(
    path.join(cacheRoot, "bc-private-routes-"),
  );
  try {
    const output = path.join(directory, "test.cjs");
    await build({
      entryPoints: [process.argv[1]],
      outfile: output,
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      tsconfig: "tsconfig.json",
      alias: {
        "@/lib/supabase/server": path.resolve(
          "scripts/fixtures/main-bersama/teacher-auth.ts",
        ),
      },
    });
    const result = spawnSync(process.execPath, [output], {
      stdio: "inherit",
      env: { ...process.env, BC_PRIVATE_ROUTE_BUNDLE: "1" },
    });
    assert.equal(result.status, 0, "Private API route assertions failed");
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
    await db.$disconnect();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
