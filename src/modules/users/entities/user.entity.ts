import {
  Entity,
  PrimaryColumn,
  Generated,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Exclude } from "class-transformer";

@Entity("users")
export class User {
  @PrimaryColumn("uuid")
  @Generated("uuid")
  id: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({ type: "varchar", length: 255, name: "password_hash" })
  passwordHash: string;

  @Column({ type: "varchar", length: 100, name: "first_name" })
  firstName: string;

  @Column({ type: "varchar", length: 100, name: "last_name" })
  lastName: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 500, nullable: true, name: "avatar_url" })
  avatarUrl: string | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  major: string | null;

  @Column({
    type: "varchar",
    length: 150,
    nullable: true,
    name: "campus_location",
  })
  campusLocation: string | null;

  @Column({
    type: "enum",
    enumName: "user_role",
    enum: ["admin", "seller", "buyer"],
    default: "seller",
  })
  role: "admin" | "seller" | "buyer";

  @Column({ type: "boolean", default: true, name: "is_active" })
  isActive: boolean;

  @Column({ type: "boolean", default: false, name: "is_email_verified" })
  isEmailVerified: boolean;

  @Column({
    type: "timestamptz",
    nullable: true,
    name: "last_login_at",
  })
  lastLoginAt: Date | null;

  @Column({ type: "int", default: 0, name: "login_count" })
  loginCount: number;

  @Column({ type: "int", default: 0, name: "failed_login_attempts" })
  failedLoginAttempts: number;

  @Column({
    type: "timestamptz",
    nullable: true,
    name: "locked_until",
  })
  lockedUntil: Date | null;

  @Column({
    type: "timestamptz",
    nullable: true,
    name: "password_changed_at",
  })
  passwordChangedAt: Date | null;

  @CreateDateColumn({
    type: "timestamptz",
    name: "created_at",
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: "timestamptz",
    name: "updated_at",
  })
  updatedAt: Date;

  @Column({
    type: "varchar",
    length: 6,
    nullable: true,
    name: "two_factor_code",
  })
  twoFactorCode: string | null;

  @Column({
    type: "timestamptz",
    nullable: true,
    name: "two_factor_expires",
  })
  twoFactorExpires: Date | null;

  get isLocked(): boolean {
    if (!this.lockedUntil) return false;
    return new Date() < this.lockedUntil;
  }
}