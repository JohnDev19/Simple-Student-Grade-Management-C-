using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace StudentGradeManager
{
    class Student
    {
        public string Name { get; set; } = "";
        public double Grade { get; set; }
        public string Status => Grade >= 75 ? "Pass" : "Fail";
        public string LetterGrade => Grade switch
        {
            >= 97 => "A+", >= 93 => "A", >= 90 => "A-",
            >= 87 => "B+", >= 83 => "B", >= 80 => "B-",
            >= 77 => "C+", >= 73 => "C", >= 70 => "C-",
            >= 67 => "D+", >= 63 => "D", >= 60 => "D-",
            _ => "F"
        };
        public double GPA => Grade switch
        {
            >= 97 => 1.00, >= 94 => 1.25, >= 91 => 1.50,
            >= 88 => 1.75, >= 85 => 2.00, >= 82 => 2.25,
            >= 79 => 2.50, >= 76 => 2.75, >= 75 => 3.00,
            _ => 5.00
        };
    }

    class StudentManager
    {
        private List<Student> _students = new();
        private const string DataFile = "students.txt";

        public StudentManager() => LoadFromFile();

        public IReadOnlyList<Student> GetAll() => _students.AsReadOnly();

        public (bool success, string message) Add(string name, double grade)
        {
            if (string.IsNullOrWhiteSpace(name)) return (false, "Name cannot be empty.");
            if (grade < 0) return (false, "Grade cannot be negative.");
            if (grade > 100) return (false, "Grade cannot exceed 100.");
            if (_students.Any(s => s.Name.Equals(name, StringComparison.OrdinalIgnoreCase)))
                return (false, $"Student '{name}' already exists.");
            _students.Add(new Student { Name = name.Trim(), Grade = grade });
            SaveToFile();
            return (true, $"Student '{name}' added successfully.");
        }

        public (bool success, string message) Update(string name, double grade)
        {
            if (grade < 0) return (false, "Grade cannot be negative.");
            if (grade > 100) return (false, "Grade cannot exceed 100.");
            var student = _students.FirstOrDefault(s => s.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (student == null) return (false, $"Student '{name}' not found.");
            student.Grade = grade;
            SaveToFile();
            return (true, $"Grade updated for '{name}'.");
        }

        public (bool success, string message) Delete(string name)
        {
            var student = _students.FirstOrDefault(s => s.Name.Equals(name, StringComparison.OrdinalIgnoreCase));
            if (student == null) return (false, $"Student '{name}' not found.");
            _students.Remove(student);
            SaveToFile();
            return (true, $"Student '{name}' removed.");
        }

        public Student? Search(string name) =>
            _students.FirstOrDefault(s => s.Name.Equals(name, StringComparison.OrdinalIgnoreCase));

        public object GetStats()
        {
            if (!_students.Any())
                return new { hasData = false };

            var sorted = _students.OrderByDescending(s => s.Grade).ToList();
            var top3 = sorted.Take(3).Select((s, i) => new { rank = i + 1, name = s.Name, grade = s.Grade, letter = s.LetterGrade }).ToList();
            var distribution = new Dictionary<string, int>
            {
                ["A (90-100)"] = _students.Count(s => s.Grade >= 90),
                ["B (80-89)"]  = _students.Count(s => s.Grade >= 80 && s.Grade < 90),
                ["C (70-79)"]  = _students.Count(s => s.Grade >= 70 && s.Grade < 80),
                ["D (60-69)"]  = _students.Count(s => s.Grade >= 60 && s.Grade < 70),
                ["F (0-59)"]   = _students.Count(s => s.Grade < 60)
            };

            return new
            {
                hasData = true,
                count = _students.Count,
                average = Math.Round(_students.Average(s => s.Grade), 2),
                highest = new { name = sorted.First().Name, grade = sorted.First().Grade },
                lowest = new { name = sorted.Last().Name, grade = sorted.Last().Grade },
                passCount = _students.Count(s => s.Grade >= 75),
                failCount = _students.Count(s => s.Grade < 75),
                avgGpa = Math.Round(_students.Average(s => s.GPA), 2),
                top3,
                distribution
            };
        }

        public List<Student> SortByGrade() => _students.OrderByDescending(s => s.Grade).ToList();
        public List<Student> SortByName()  => _students.OrderBy(s => s.Name).ToList();
        public List<Student> SortByGPA()   => _students.OrderBy(s => s.GPA).ToList();

        private void SaveToFile()
        {
            var lines = _students.Select(s => $"{s.Name}|{s.Grade}");
            File.WriteAllLines(DataFile, lines);
        }

        private void LoadFromFile()
        {
            if (!File.Exists(DataFile)) return;
            foreach (var line in File.ReadAllLines(DataFile))
            {
                var parts = line.Split('|');
                if (parts.Length == 2 && double.TryParse(parts[1], out double grade))
                    _students.Add(new Student { Name = parts[0], Grade = grade });
            }
        }
    }

    class Program
    {
        static readonly StudentManager manager = new();
        static readonly JsonSerializerOptions jsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        static async Task Main()
        {
            int port = int.TryParse(Environment.GetEnvironmentVariable("PORT"), out int envPort) ? envPort : 5000;
            var listener = new HttpListener();
            listener.Prefixes.Add($"http://*:{port}/");
            listener.Start();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("╔══════════════════════════════════════╗");
            Console.WriteLine("║    Student Grade Manager - Running   ║");
            Console.WriteLine($"║    http://0.0.0.0:{port,-22} ║");
            Console.WriteLine("║    Press Ctrl+C to stop              ║");
            Console.WriteLine("╚══════════════════════════════════════╝");
            Console.ResetColor();

            while (true)
            {
                var ctx = await listener.GetContextAsync();
                _ = Task.Run(() => HandleRequest(ctx));
            }
        }

        static async Task HandleRequest(HttpListenerContext ctx)
        {
            var req = ctx.Request;
            var res = ctx.Response;
            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

            if (req.HttpMethod == "OPTIONS") { res.StatusCode = 200; res.Close(); return; }

            string path = req.Url?.AbsolutePath ?? "/";

            try
            {
                if (path == "/" || path == "/index.html")
                {
                    await ServeHtml(res);
                }
                else if (path.StartsWith("/css/") || path.StartsWith("/js/"))
                {
                    await ServeStatic(res, path);
                }
                else if (path == "/api/students" && req.HttpMethod == "GET")
                {
                    string sort = req.QueryString["sort"] ?? "name";
                    var students = sort == "grade" ? manager.SortByGrade()
                                 : sort == "gpa"   ? manager.SortByGPA()
                                 : manager.SortByName();
                    await WriteJson(res, students);
                }
                else if (path == "/api/students" && req.HttpMethod == "POST")
                {
                    var body = await ReadBody(req);
                    var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(body);
                    string name = data!["name"].GetString()!;
                    double grade = data["grade"].GetDouble();
                    var (ok, msg) = manager.Add(name, grade);
                    await WriteJson(res, new { success = ok, message = msg }, ok ? 200 : 400);
                }
                else if (path.StartsWith("/api/students/") && req.HttpMethod == "PUT")
                {
                    string name = Uri.UnescapeDataString(path["/api/students/".Length..]);
                    var body = await ReadBody(req);
                    var data = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(body);
                    double grade = data!["grade"].GetDouble();
                    var (ok, msg) = manager.Update(name, grade);
                    await WriteJson(res, new { success = ok, message = msg }, ok ? 200 : 400);
                }
                else if (path.StartsWith("/api/students/") && req.HttpMethod == "DELETE")
                {
                    string name = Uri.UnescapeDataString(path["/api/students/".Length..]);
                    var (ok, msg) = manager.Delete(name);
                    await WriteJson(res, new { success = ok, message = msg }, ok ? 200 : 400);
                }
                else if (path.StartsWith("/api/search") && req.HttpMethod == "GET")
                {
                    string q = req.QueryString["q"] ?? "";
                    var student = manager.Search(q);
                    if (student != null) await WriteJson(res, student);
                    else await WriteJson(res, new { message = "Not found" }, 404);
                }
                else if (path == "/api/stats" && req.HttpMethod == "GET")
                {
                    await WriteJson(res, manager.GetStats());
                }
                else
                {
                    res.StatusCode = 404;
                    res.Close();
                }
            }
            catch (Exception ex)
            {
                await WriteJson(res, new { error = ex.Message }, 500);
            }
        }

        static async Task WriteJson(HttpListenerResponse res, object data, int status = 200)
        {
            res.StatusCode = status;
            res.ContentType = "application/json";
            var json = JsonSerializer.Serialize(data, jsonOpts);
            var bytes = Encoding.UTF8.GetBytes(json);
            await res.OutputStream.WriteAsync(bytes);
            res.Close();
        }

        static async Task<string> ReadBody(HttpListenerRequest req)
        {
            using var reader = new StreamReader(req.InputStream, req.ContentEncoding);
            return await reader.ReadToEndAsync();
        }

        static string GetWwwRoot()
        {
            string a = Path.Combine(AppContext.BaseDirectory, "wwwroot");
            if (Directory.Exists(a)) return a;
            return Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        }

        static async Task ServeHtml(HttpListenerResponse res)
        {
            res.ContentType = "text/html; charset=utf-8";
            string htmlFile = Path.Combine(GetWwwRoot(), "index.html");
            var bytes = await File.ReadAllBytesAsync(htmlFile);
            await res.OutputStream.WriteAsync(bytes);
            res.Close();
        }

        static async Task ServeStatic(HttpListenerResponse res, string urlPath)
        {
            string filePath = Path.Combine(GetWwwRoot(), urlPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(filePath)) { res.StatusCode = 404; res.Close(); return; }

            string ext = Path.GetExtension(filePath).ToLower();
            res.ContentType = ext switch
            {
                ".css" => "text/css; charset=utf-8",
                ".js"  => "application/javascript; charset=utf-8",
                _      => "application/octet-stream"
            };
            var bytes = await File.ReadAllBytesAsync(filePath);
            await res.OutputStream.WriteAsync(bytes);
            res.Close();
        }
    }
}