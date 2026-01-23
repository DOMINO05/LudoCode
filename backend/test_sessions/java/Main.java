import java.util.Scanner;
public class Main {
    public static void main(String[] args) {
        System.out.println("Java Interaction Test");
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter your name: ");
        String name = sc.nextLine();
        System.out.println("Hello, " + name + "!");
    }
}
