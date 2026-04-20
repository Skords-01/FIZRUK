import { describe, it, expect } from "vitest";
import { MeResponseSchema, UserSchema } from "./api";

describe("UserSchema", () => {
  it("парсить мінімально валідного користувача", () => {
    expect(
      UserSchema.parse({
        id: "u-1",
        email: "x@y.com",
        name: "Ім'я",
        image: null,
        emailVerified: true,
      }),
    ).toEqual({
      id: "u-1",
      email: "x@y.com",
      name: "Ім'я",
      image: null,
      emailVerified: true,
    });
  });

  it("дозволяє null у email/name/image", () => {
    expect(
      UserSchema.parse({
        id: "u-2",
        email: null,
        name: null,
        image: null,
        emailVerified: false,
      }),
    ).toMatchObject({ email: null, name: null, image: null });
  });

  it.each(["", " ", "bad-email"])("падає на невалідному email %p", (email) => {
    expect(() =>
      UserSchema.parse({
        id: "u-3",
        email,
        name: null,
        image: null,
        emailVerified: false,
      }),
    ).toThrow();
  });

  it("падає на порожньому id", () => {
    expect(() =>
      UserSchema.parse({
        id: "",
        email: null,
        name: null,
        image: null,
        emailVerified: false,
      }),
    ).toThrow();
  });
});

describe("MeResponseSchema", () => {
  it("вимагає поле user", () => {
    expect(() => MeResponseSchema.parse({})).toThrow();
  });

  it("парсить повний response", () => {
    const parsed = MeResponseSchema.parse({
      user: {
        id: "u-4",
        email: "a@b.co",
        name: "A",
        image: "https://x.test/avatar.png",
        emailVerified: true,
      },
    });
    expect(parsed.user.id).toBe("u-4");
  });
});
